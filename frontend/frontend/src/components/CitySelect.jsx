import { CAMEROON_CITIES } from '../utils/cameroonCities';

export default function CitySelect({
  id,
  name = 'city',
  value,
  onChange,
  required = false,
  className = '',
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={className}
    >
      <option value="">— Choisir une ville —</option>
      {CAMEROON_CITIES.map((city) => (
        <option key={city} value={city}>{city}</option>
      ))}
    </select>
  );
}
