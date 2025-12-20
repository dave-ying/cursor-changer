import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('components/ui/safe-card', () => {
  it('renders SafeCard and subcomponents', async () => {
    const mod = await import('@/components/ui/safe-card');

    const { SafeCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, OriginalCard } = mod;

    render(
      <div>
        <SafeCard data-testid="safe">
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Body</CardContent>
          <CardFooter>Footer</CardFooter>
        </SafeCard>
        <OriginalCard data-testid="orig" />
      </div>
    );

    expect(screen.getByTestId('safe')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByTestId('orig')).toBeInTheDocument();
  });
});
