import React from 'react';

import { getCircleButtonStyle } from './HotspotControls.styles';

type CircleToggleButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & {
  selected: boolean;
  backgroundColor?: string;
  background?: string;
  border?: string;
  color?: string;
  boxShadow?: string;
};

export function CircleToggleButton({
  selected,
  backgroundColor,
  background,
  border,
  color,
  boxShadow,
  ...props
}: CircleToggleButtonProps) {
  return (
    <button
      {...props}
      style={getCircleButtonStyle({
        selected,
        backgroundColor,
        background,
        border,
        color,
        boxShadow
      })}
    />
  );
}
