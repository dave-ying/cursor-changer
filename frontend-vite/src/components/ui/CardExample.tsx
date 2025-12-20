// Example usage of the shadcn Card component
// This file demonstrates all Card subcomponents

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from '@/components/ui/button';

export function CardExample() {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content goes here</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  );
}

// Simple usage example
export function SimpleCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is a simple card with just title and content.</p>
      </CardContent>
    </Card>
  );
}

// Content-only card (backward compatible)
export function ContentOnlyCard() {
  return (
    <Card className="p-6">
      <p>This card uses the old pattern with direct children.</p>
    </Card>
  );
}
