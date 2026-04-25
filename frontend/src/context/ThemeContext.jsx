import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // On first load, check if user previously chose a theme
    // If not, default to dark mode
    const saved = localStorage.getItem('mediAI_theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    const root = document.documentElement

    if (isDark) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    // Save preference so it persists after page refresh
    localStorage.setItem('mediAI_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook to use theme anywhere: const { isDark, toggleTheme } = useTheme()
export const useTheme = () => useContext(ThemeContext)
