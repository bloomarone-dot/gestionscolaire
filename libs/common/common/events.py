"""Bus d'événements RabbitMQ (publication / consommation).

Topologie : un exchange ``topic`` unique (``gs.events``). Chaque service publie
des événements métier (``StudentEnrolled``, ``BulletinPublished`` …) avec une
routing key = nom de l'événement. Les conscommateurs (ex. notifications-service)
lient une queue durable aux clés qui les intéressent, avec dead-letter pour les
échecs.

Règle §13 : la publication ne doit jamais bloquer le parcours métier. En cas
d'indisponibilité du broker, on log et on continue (best-effort).
"""
import json
import logging
from typing import Any, Callable, Iterable, Optional

import pika

logger = logging.getLogger(__name__)


class EventNames:
    STUDENT_ENROLLED = "StudentEnrolled"
    BULLETIN_PUBLISHED = "BulletinPublished"
    TEACHER_ASSIGNED = "TeacherAssigned"
    CLASS_SUBJECTS_UPDATED = "ClassSubjectsUpdated"
    STUDENT_TRANSFERRED = "StudentTransferred"
    STUDENT_PROMOTED = "StudentPromoted"


class EventPublisher:
    """Publisher best-effort. Reconnexion paresseuse, jamais bloquant."""

    def __init__(self, rabbitmq_url: str, exchange: str = "gs.events"):
        self._url = rabbitmq_url
        self._exchange = exchange
        self._connection: Optional[pika.BlockingConnection] = None
        self._channel = None

    def _ensure_channel(self):
        if self._channel and self._channel.is_open:
            return self._channel
        params = pika.URLParameters(self._url)
        self._connection = pika.BlockingConnection(params)
        self._channel = self._connection.channel()
        self._channel.exchange_declare(
            exchange=self._exchange, exchange_type="topic", durable=True
        )
        return self._channel

    def publish(self, event_name: str, payload: dict[str, Any]) -> bool:
        """Publie un événement. Retourne False (sans lever) si échec."""
        body = json.dumps(
            {"event": event_name, "data": payload}, ensure_ascii=False, default=str
        ).encode("utf-8")
        try:
            channel = self._ensure_channel()
            channel.basic_publish(
                exchange=self._exchange,
                routing_key=event_name,
                body=body,
                properties=pika.BasicProperties(
                    content_type="application/json", delivery_mode=2
                ),
            )
            return True
        except Exception as exc:  # best-effort : ne jamais casser le parcours métier
            logger.warning("Publication événement '%s' échouée : %s", event_name, exc)
            self._channel = None
            self._connection = None
            return False

    def close(self):
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass


def consume(
    rabbitmq_url: str,
    queue: str,
    routing_keys: Iterable[str],
    handler: Callable[[str, dict], None],
    *,
    exchange: str = "gs.events",
) -> None:
    """Boucle de consommation bloquante (à lancer dans le worker du service).

    ``handler(event_name, data)`` ; une exception renvoie le message en
    dead-letter (requeue=False).
    """
    params = pika.URLParameters(rabbitmq_url)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)
    dlx = f"{exchange}.dlx"
    channel.exchange_declare(exchange=dlx, exchange_type="fanout", durable=True)
    channel.queue_declare(
        queue=queue, durable=True, arguments={"x-dead-letter-exchange": dlx}
    )
    for key in routing_keys:
        channel.queue_bind(exchange=exchange, queue=queue, routing_key=key)

    def _on_message(ch, method, _properties, body):
        try:
            msg = json.loads(body)
            handler(msg.get("event", ""), msg.get("data", {}))
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as exc:
            logger.exception("Traitement événement échoué : %s", exc)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    channel.basic_qos(prefetch_count=10)
    channel.basic_consume(queue=queue, on_message_callback=_on_message)
    logger.info("Consommation de %s sur les clés %s", queue, list(routing_keys))
    channel.start_consuming()
