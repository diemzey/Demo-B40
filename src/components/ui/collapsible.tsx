"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

/** Alias de `CollapsibleContent` para patrones escritos contra la API de Base UI. */
const CollapsiblePanel = CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsiblePanel }
