import * as React from "react"

import { cn } from "@/lib/utils"

export function Card(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-xl border shadow-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}

export function CardHeader(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-1.5 p-6",
        className
      )}
      ref={ref}
      {...props}
    />
  )
}

export function CardTitle(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> }
) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      ref={ref}
      {...props}
    />
  )
}

export function CardDescription(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }
) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      ref={ref}
      {...props}
    />
  )
}

export function CardAction(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
) {
  return (
    <div
      data-slot="card-action"
      className={cn("flex items-center gap-2", className)}
      ref={ref}
      {...props}
    />
  )
}

export function CardContent(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      ref={ref}
      {...props}
    />
  )
}

export function CardFooter(
  {
    className,
    ref,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      ref={ref}
      {...props}
    />
  )
}
