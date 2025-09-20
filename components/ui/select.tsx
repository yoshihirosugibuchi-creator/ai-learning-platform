"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple native select implementation
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onClick?: () => void
}

interface SelectValueProps {
  placeholder?: string
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, onValueChange } as Record<string, unknown>)
        }
        return child
      })}
    </div>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLDivElement,
  SelectTriggerProps & { value?: string; onValueChange?: (value: string) => void }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </div>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ children }: SelectContentProps) => {
  return (
    <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

const SelectItem = ({ value, children, onClick }: SelectItemProps) => (
  <div
    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
    onClick={onClick}
  >
    {children}
  </div>
)

const SelectValue = ({ placeholder }: SelectValueProps) => (
  <span className="pointer-events-none">{placeholder}</span>
)

// For the analytics page, let's create a simple implementation using native select
const SimpleSelect = ({ 
  value, 
  onValueChange, 
  children, 
  className 
}: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}) => {
  const options = React.Children.toArray(children).filter(
    child => React.isValidElement(child) && child.type === SimpleSelectItem
  ) as React.ReactElement[]

  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {options.map((option, index) => (
        <option key={index} value={option.props.value}>
          {option.props.children}
        </option>
      ))}
    </select>
  )
}

const SimpleSelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <>{children}</>
)

// Export both implementations
export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SimpleSelect,
  SimpleSelectItem
}