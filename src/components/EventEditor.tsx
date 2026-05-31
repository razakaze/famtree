import type { LifeEvent } from '../types'
import { parseFuzzyDate } from '../util'

interface Props {
  label: string
  value?: LifeEvent
  onChange: (next: LifeEvent | undefined) => void
}

export default function EventEditor({ label, value, onChange }: Props) {
  const date = value?.date?.raw ?? ''
  const place = value?.place ?? ''

  function update(next: Partial<{ date: string; place: string }>) {
    const nextDate = next.date !== undefined ? next.date : date
    const nextPlace = next.place !== undefined ? next.place : place
    if (!nextDate && !nextPlace) {
      onChange(undefined)
    } else {
      onChange({
        date: nextDate ? parseFuzzyDate(nextDate) : undefined,
        place: nextPlace || undefined,
      })
    }
  }

  return (
    <fieldset className="border border-slate-200 rounded p-3 bg-white">
      <legend className="px-1 text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</legend>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <label className="block">
          <span className="text-xs text-slate-500 block mb-0.5">Dato</span>
          <input
            type="text"
            value={date}
            onChange={e => update({ date: e.target.value })}
            placeholder="fx 1898-12-28 eller 28/12 1898"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 block mb-0.5">Sted</span>
          <input
            type="text"
            value={place}
            onChange={e => update({ place: e.target.value })}
            placeholder="fx Lime Sogn, Viborg Amt"
            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </label>
      </div>
    </fieldset>
  )
}
