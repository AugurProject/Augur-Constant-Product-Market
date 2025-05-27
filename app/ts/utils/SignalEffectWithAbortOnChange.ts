import { Signal } from '@preact/signals'
import { OptionalSignal, isOptionalSignal } from './OptionalSignal.js'
import { useEffect } from 'preact/hooks'

type UnionSignalType<T> = T extends OptionalSignal<infer U> ? U | undefined : T extends Signal<infer U> ? U extends Signal<infer Inner> ? Inner : U : never
type SignalTypes<T extends readonly [...(Signal<unknown> | OptionalSignal<unknown>)[]]> = { [K in keyof T]: UnionSignalType<T[K]> }
export function useSignalEffectWithAbortOnChange<T extends readonly (Signal<unknown> | OptionalSignal<unknown>)[]>(signals: T, func: (abortSignal: AbortSignal, ...values: SignalTypes<T>) => Promise<void>, onError: (error: unknown) => void) {
	return useEffect(() => {
		let abortController = new AbortController()
		const cleanupFns: (() => void)[] = []
		const run = () => {
			abortController.abort()
			abortController = new AbortController()
			const values = signals.map(signal => isOptionalSignal(signal) ? signal.deepValue : signal.value) as SignalTypes<T>
			func(abortController.signal, ...values).catch(onError)
		}
		const subscribeTo = (signal: Signal<unknown>, onChange: () => void) => cleanupFns.push(signal.subscribe(onChange))
		const setupInner = (optional: OptionalSignal<any>) => {
			const inner = optional.peek()
			if (inner !== undefined) subscribeTo(inner, run)
		}
		for (const signal of signals) {
			if (isOptionalSignal(signal)) {
				// Subscribe to the outer OptionalSignal (when inner changes)
				subscribeTo(signal, () => {
					run()
					// Resubscribe to new inner value if needed
					setupInner(signal)
				})
				// Subscribe to the current inner if exists
				setupInner(signal)
			} else {
				subscribeTo(signal, run)
			}
		}
		run()
		return () => {
			cleanupFns.forEach(fn => fn())
			abortController.abort()
		}
	}, [])
}
