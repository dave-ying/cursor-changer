import React from 'react';

export const columnContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  height: '100%'
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: 'var(--text-secondary)',
  marginBottom: '0.25rem'
};

export const headlineStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '0.5rem',
  color: 'hsl(var(--foreground))',
  textAlign: 'center'
};

export const subLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  color: '#777'
};

export const modeButtonStyle: React.CSSProperties = {
  padding: '0.375rem 0.5rem',
  fontSize: '0.75rem'
};

export const circleButtonBaseStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

export function getCircleButtonStyle(options: {
  selected: boolean;
  backgroundColor?: string;
  background?: string;
  border?: string;
  color?: string;
  boxShadow?: string;
}): React.CSSProperties {
  const {
    selected,
    backgroundColor,
    background,
    border = 'none',
    color = '#333',
    boxShadow
  } = options;

  return {
    ...circleButtonBaseStyle,
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(background ? { background } : {}),
    border,
    color,
    boxShadow: boxShadow ?? (selected ? '0 0 0 1.5px rgba(255, 255, 255, 0.5)' : 'none')
  };
}

export const colorWheelButtonStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: 'none',
  transition: 'all 0.2s',
  boxShadow: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  overflow: 'hidden',
  backgroundColor: 'transparent',
  cursor: 'pointer'
};

export const coordinateInputStyle: React.CSSProperties = {
  fontSize: 11,
  padding: '0.25rem',
  backgroundColor: 'rgba(120, 119, 198, 0.1)',
  border: '1px solid rgba(120, 119, 198, 0.3)',
  color: 'hsl(var(--primary))',
  borderRadius: '4px',
  cursor: 'text'
};

export const nudgeButtonStyle: React.CSSProperties = {
  padding: '2px',
  height: '28px',
  fontSize: '0.7rem'
};

export const nudgeCenterButtonStyle: React.CSSProperties = {
  padding: '2px',
  height: '28px',
  fontSize: '0.6rem'
};
