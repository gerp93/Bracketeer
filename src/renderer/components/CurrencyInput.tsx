import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/**
 * A dollar-amount input: shows a fully formatted "$1,200,000" while blurred,
 * switches to a plain digit string while focused so typing/cursor placement
 * stays predictable, and calls onChange on every keystroke (not just on
 * blur) so the live, recompute-as-you-type feel elsewhere in the app still
 * holds for these fields.
 */
export default function CurrencyInput({ value, onChange, disabled }: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    setText(value === 0 ? '' : String(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9-]/g, '');
    setText(cleaned);
    onChange(cleaned === '' || cleaned === '-' ? 0 : Number(cleaned));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? text : currencyFormatter.format(value)}
      onFocus={handleFocus}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}
