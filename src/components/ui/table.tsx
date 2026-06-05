import * as React from "react"

import { cn } from "@/lib/utils"

export function Table(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLTableElement> & { ref?: React.Ref<HTMLTableElement> }
) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        ref={ref}
        {...props}
      />
    </div>
  )
}

export function TableHeader(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement> & {
    ref?: React.Ref<HTMLTableSectionElement>
  }
) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      ref={ref}
      {...props}
    />
  )
}

export function TableBody(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement> & {
    ref?: React.Ref<HTMLTableSectionElement>
  }
) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      ref={ref}
      {...props}
    />
  )
}

export function TableFooter(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLTableSectionElement> & {
    ref?: React.Ref<HTMLTableSectionElement>
  }
) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}

export function TableHead(
  {
    className,
    ref,
    ...props
  }: React.ThHTMLAttributes<HTMLTableCellElement> & {
    ref?: React.Ref<HTMLTableCellElement>
  }
) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-4 text-left align-middle font-medium text-muted-foreground",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}

export function TableRow(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLTableRowElement> & {
    ref?: React.Ref<HTMLTableRowElement>
  }
) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}

export function TableCell(
  {
    className,
    ref,
    ...props
  }: React.TdHTMLAttributes<HTMLTableCellElement> & {
    ref?: React.Ref<HTMLTableCellElement>
  }
) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-4 align-middle",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}

export function TableCaption(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLTableCaptionElement> & {
    ref?: React.Ref<HTMLTableCaptionElement>
  }
) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      ref={ref}
      {...props}
    />
  )
}
