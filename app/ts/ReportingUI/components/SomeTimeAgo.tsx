import { useEffect } from 'preact/hooks'
import { useComputed, useSignal } from '@preact/signals'
import { JSX } from 'preact'
import { humanReadableDateDelta } from '../../utils/utils.js'

interface SomeTimeAgoProps {
	priorTimestamp: Date,
	countBackwards?: boolean,
	diffToText?: (secondsDiff: number) => JSX.Element
}

export function SomeTimeAgo(props: SomeTimeAgoProps) {
	const getTimeDiff = () => (props.priorTimestamp.getTime() - new Date().getTime()) / 1000
	const timeDiff = useSignal(getTimeDiff())
	const diffTotext = props.diffToText !== undefined ? props.diffToText : humanReadableDateDelta
	const humanReadableTimeDiff = useComputed(() => diffTotext(props.countBackwards ? timeDiff.value : -timeDiff.value))
	useEffect(() => {
		const id = setInterval(() => { timeDiff.value = getTimeDiff() }, 1000)
		return () => clearInterval(id)
	})
	useEffect(() => { timeDiff.value = getTimeDiff() }, [props.priorTimestamp])
	return <>{ humanReadableTimeDiff.value }</>
}
