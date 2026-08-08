import React from 'react'
import { Link } from 'react-router-dom'
import { HiChevronRight } from 'react-icons/hi'

const Breadcrumb = ({ items = [] }) => {
  if (!items.length) return null
  return (
    <nav className="flex items-center gap-1 text-xs text-dark-400 mt-1">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <HiChevronRight className="text-dark-300 flex-shrink-0" />}
          {item.to && i < items.length - 1 ? (
            <Link to={item.to} className="hover:text-primary-500 transition-colors truncate max-w-[120px]">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? 'text-dark-600 dark:text-dark-300 font-medium truncate max-w-[160px]' : 'truncate max-w-[120px]'}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumb
