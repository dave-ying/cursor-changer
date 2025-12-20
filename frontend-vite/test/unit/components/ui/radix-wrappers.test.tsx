import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

function filterDomProps(props: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props)) {
    if (
      k === 'children' ||
      k === 'ref' ||
      k === 'asChild' ||
      k === 'sideOffset' ||
      k === 'side' ||
      k === 'align' ||
      k === 'alignOffset' ||
      k === 'collisionPadding' ||
      k === 'avoidCollisions' ||
      k === 'position' ||
      k === 'scrollHideDelay' ||
      k === 'type'
    ) {
      continue;
    }

    // Allow common DOM props
    if (
      k === 'className' ||
      k === 'style' ||
      k === 'role' ||
      k === 'id' ||
      k === 'tabIndex' ||
      k === 'title' ||
      k.startsWith('data-') ||
      k.startsWith('aria-') ||
      k.startsWith('on')
    ) {
      out[k] = v;
    }
  }
  return out;
}

function primitive(tag: string) {
  const Comp = React.forwardRef<any, any>(({ children, ...props }, ref) => (
    <div ref={ref} data-primitive={tag} {...filterDomProps(props)}>
      {children}
    </div>
  ));
  Comp.displayName = tag;
  return Comp;
}

// Mock Radix primitives so wrapper components execute without requiring real portal/DOM behavior
vi.mock('@radix-ui/react-context-menu', () => {
  const Root = primitive('ContextMenuRoot');
  return {
    Root,
    Trigger: primitive('ContextMenuTrigger'),
    Group: primitive('ContextMenuGroup'),
    Portal: primitive('ContextMenuPortal'),
    Sub: primitive('ContextMenuSub'),
    RadioGroup: primitive('ContextMenuRadioGroup'),
    SubTrigger: primitive('ContextMenuSubTrigger'),
    SubContent: primitive('ContextMenuSubContent'),
    Content: primitive('ContextMenuContent'),
    Item: primitive('ContextMenuItem'),
    CheckboxItem: primitive('ContextMenuCheckboxItem'),
    ItemIndicator: primitive('ContextMenuItemIndicator'),
    RadioItem: primitive('ContextMenuRadioItem'),
    Label: primitive('ContextMenuLabel'),
    Separator: primitive('ContextMenuSeparator'),
  };
});

vi.mock('@radix-ui/react-dropdown-menu', () => {
  const Root = primitive('DropdownMenuRoot');
  return {
    Root,
    Trigger: primitive('DropdownMenuTrigger'),
    Group: primitive('DropdownMenuGroup'),
    Portal: primitive('DropdownMenuPortal'),
    Sub: primitive('DropdownMenuSub'),
    RadioGroup: primitive('DropdownMenuRadioGroup'),
    SubTrigger: primitive('DropdownMenuSubTrigger'),
    SubContent: primitive('DropdownMenuSubContent'),
    Content: primitive('DropdownMenuContent'),
    Item: primitive('DropdownMenuItem'),
    CheckboxItem: primitive('DropdownMenuCheckboxItem'),
    ItemIndicator: primitive('DropdownMenuItemIndicator'),
    RadioItem: primitive('DropdownMenuRadioItem'),
    Label: primitive('DropdownMenuLabel'),
    Separator: primitive('DropdownMenuSeparator'),
  };
});

vi.mock('@radix-ui/react-select', () => {
  const Root = primitive('SelectRoot');
  return {
    Root,
    Group: primitive('SelectGroup'),
    Value: primitive('SelectValue'),
    Trigger: primitive('SelectTrigger'),
    Portal: primitive('SelectPortal'),
    Content: primitive('SelectContent'),
    Viewport: primitive('SelectViewport'),
    ScrollUpButton: primitive('SelectScrollUpButton'),
    ScrollDownButton: primitive('SelectScrollDownButton'),
    Label: primitive('SelectLabel'),
    Item: primitive('SelectItem'),
    ItemText: primitive('SelectItemText'),
    ItemIndicator: primitive('SelectItemIndicator'),
    Separator: primitive('SelectSeparator'),
    Icon: primitive('SelectIcon'),
  };
});

vi.mock('@radix-ui/react-tooltip', () => {
  return {
    Provider: primitive('TooltipProvider'),
    Root: primitive('TooltipRoot'),
    Trigger: primitive('TooltipTrigger'),
    Portal: primitive('TooltipPortal'),
    Content: primitive('TooltipContent'),
  };
});

vi.mock('@radix-ui/react-scroll-area', () => {
  return {
    Root: primitive('ScrollAreaRoot'),
    Viewport: primitive('ScrollAreaViewport'),
    Corner: primitive('ScrollAreaCorner'),
    ScrollAreaScrollbar: primitive('ScrollAreaScrollbar'),
    ScrollAreaThumb: primitive('ScrollAreaThumb'),
  };
});

describe('components/ui Radix wrapper modules', () => {
  it('exports and renders wrapper components', async () => {
    const ctx = await import('@/components/ui/context-menu');
    const dd = await import('@/components/ui/dropdown-menu');
    const sel = await import('@/components/ui/select');
    const tip = await import('@/components/ui/tooltip');
    const sa = await import('@/components/ui/scroll-area');

    render(
      <div>
        <ctx.ContextMenu>
          <ctx.ContextMenuTrigger>Trigger</ctx.ContextMenuTrigger>
          <ctx.ContextMenuContent>
            <ctx.ContextMenuItem>Item</ctx.ContextMenuItem>
          </ctx.ContextMenuContent>
        </ctx.ContextMenu>

        <dd.DropdownMenu>
          <dd.DropdownMenuTrigger>Trigger</dd.DropdownMenuTrigger>
          <dd.DropdownMenuContent>
            <dd.DropdownMenuItem>Item</dd.DropdownMenuItem>
          </dd.DropdownMenuContent>
        </dd.DropdownMenu>

        <sel.Select>
          <sel.SelectTrigger>
            <sel.SelectValue>v</sel.SelectValue>
          </sel.SelectTrigger>
          <sel.SelectContent>
            <sel.SelectItem value="a">A</sel.SelectItem>
          </sel.SelectContent>
        </sel.Select>

        <tip.TooltipProvider>
          <tip.Tooltip>
            <tip.TooltipTrigger>t</tip.TooltipTrigger>
            <tip.TooltipContent>c</tip.TooltipContent>
          </tip.Tooltip>
        </tip.TooltipProvider>

        <sa.ScrollArea>
          <div>scroll</div>
        </sa.ScrollArea>
      </div>
    );

    expect(screen.getAllByText('Trigger').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Item').length).toBeGreaterThan(0);
  });
});
