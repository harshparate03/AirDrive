import React from 'react'
import { HiCloudUpload } from 'react-icons/hi'

const BrandLogo = ({ className = '', iconClassName = '' }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-[28%] bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-neon ${className}`}
    aria-hidden="true"
  >
    <HiCloudUpload className={iconClassName} />
  </span>
)

export default BrandLogo
