"""Add date_creation to professeurs and notes tables

Revision ID: a1b2c3d4e5f6
Revises: 839e558b7096
Create Date: 2026-06-08 16:09:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '839e558b7096'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('professeurs', sa.Column('date_creation', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))
    op.add_column('notes', sa.Column('date_creation', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('notes', 'date_creation')
    op.drop_column('professeurs', 'date_creation')