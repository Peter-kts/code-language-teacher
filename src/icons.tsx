// Thin line icons for the step controls. They inherit the text color.
import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const SkipBackIcon = () => (
  <Icon>
    <path d="M6 5v14" />
    <path d="M18 6.5v11a.6.6 0 0 1-.92.5L9.5 12.5a.6.6 0 0 1 0-1L17.08 6a.6.6 0 0 1 .92.5Z" />
  </Icon>
)

export const StepBackIcon = () => (
  <Icon>
    <path d="M15 5.5 8.5 12l6.5 6.5" />
  </Icon>
)

export const PlayIcon = () => (
  <Icon>
    <path d="M8 5.6v12.8a.6.6 0 0 0 .9.52l10.2-6.4a.6.6 0 0 0 0-1.04L8.9 5.08a.6.6 0 0 0-.9.52Z" fill="currentColor" />
  </Icon>
)

export const PauseIcon = () => (
  <Icon>
    <path d="M9 5.5v13M15 5.5v13" strokeWidth="2.4" />
  </Icon>
)

export const StepForwardIcon = () => (
  <Icon>
    <path d="m9 5.5 6.5 6.5L9 18.5" />
  </Icon>
)

export const SkipForwardIcon = () => (
  <Icon>
    <path d="M18 5v14" />
    <path d="M6 6.5v11a.6.6 0 0 0 .92.5l7.58-5.5a.6.6 0 0 0 0-1L6.92 6a.6.6 0 0 0-.92.5Z" />
  </Icon>
)

export const KeyboardIcon = () => (
  <Icon>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M18 10h.01M6.5 14h.01M18 14h.01M9.5 14h5.5" />
  </Icon>
)
