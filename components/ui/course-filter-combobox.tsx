'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export interface CourseOption {
  id: string
  title: string
}

interface CourseFilterComboboxProps {
  courses: CourseOption[]
  value: string
  onValueChange: (value: string) => void
}

/**
 * コースフィルター コンボボックス
 * - PC: Popover + Command（検索付きドロップダウン）
 * - モバイル: Sheet（ボトムシート）+ Command
 */
export default function CourseFilterCombobox({
  courses,
  value,
  onValueChange,
}: CourseFilterComboboxProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedLabel = value === 'all'
    ? '全コース'
    : courses.find(c => c.id === value)?.title ?? '全コース'

  const handleSelect = (courseId: string) => {
    onValueChange(courseId)
    setPopoverOpen(false)
    setSheetOpen(false)
  }

  const commandContent = (
    <Command>
      <CommandInput placeholder="コース名で検索..." />
      <CommandList>
        <CommandEmpty>該当するコースがありません</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="all"
            keywords={['全コース', 'すべて', 'all']}
            onSelect={() => handleSelect('all')}
          >
            <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
            全コース
            {value === 'all' && <Check className="ml-auto h-4 w-4" />}
          </CommandItem>
          {courses.map(course => (
            <CommandItem
              key={course.id}
              value={course.id}
              keywords={[course.title]}
              onSelect={() => handleSelect(course.id)}
            >
              <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="truncate">{course.title}</span>
              {value === course.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  return (
    <>
      {/* PC: Popover */}
      <div className="hidden md:block">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={popoverOpen}
              className="w-full justify-between"
            >
              <span className="truncate">{selectedLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            {commandContent}
          </PopoverContent>
        </Popover>
      </div>

      {/* モバイル: ボトムシート */}
      <div className="md:hidden">
        <Button
          variant="outline"
          role="combobox"
          onClick={() => setSheetOpen(true)}
          className="w-full justify-between"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="px-0 pb-safe">
            <SheetHeader className="px-6 pb-2">
              <SheetTitle>コースを選択</SheetTitle>
              <SheetDescription>フィルターするコースを選んでください</SheetDescription>
            </SheetHeader>
            <div className="max-h-[60vh] overflow-hidden">
              {commandContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
