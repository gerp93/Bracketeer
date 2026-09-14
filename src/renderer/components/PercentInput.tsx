import { useEffect, useState } from 'react';

interface Props {
  /** Stored/passed as a decimal (0.025), displayed and edited as a percentage (2.5). */
  value: number;
  onChange: (value: number) => void;
}

function displayPercent(value: number): string {
  // Round before stringifying so floating-point noise (0.025*100 = 2.5000000000000004) doesn't show up.
  return String(Math.round(value * 100 * 10_000) / 10_000);
}

/**
 * A percentage input: the underlying value is a decimal (what the engine
 * expects), but the field shows and accepts the percentage figure directly
 * (2.5, not 0.025) with a trailing "%" while blurred. Calls onChange on
 * every keystroke, matching CurrencyInput's live-recompute behavior.
 */
export default function PercentInput({ value, onChange }: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(displayPercent(value));

  useEffect(() => {
    if (!focused) setText(displayPercent(value));
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    setText(value === 0 ? '' : displayPercent(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^0-9.-]/g, '');
    setText(cleaned);
    const parsed = Number(cleaned);
    onChange(cleaned === '' || cleaned === '-' || Number.isNaN(parsed) ? 0 : parsed / 100);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? text : `${text}%`}
      onFocus={handleFocus}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
    />
  );
}
