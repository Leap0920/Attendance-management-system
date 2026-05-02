import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import './AssistedPassword.css'

export function AssistedPasswordConfirmation({
  password,
  onMatch,
  showPassword: parentShowPassword = false
}: {
  password: string
  onMatch?: (isMatch: boolean) => void
  showPassword?: boolean
}) {
  const [confirmPassword, setConfirmPassword] = useState('')
  const [shake, setShake] = useState(false)
  const [localShowPassword, setLocalShowPassword] = useState(false)

  const isVisible = localShowPassword || parentShowPassword

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value
    if (
      confirmPassword.length >= password.length &&
      value.length > confirmPassword.length
    ) {
      setShake(true)
    } else {
      setConfirmPassword(value)
    }
  }

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(timer)
    }
  }, [shake])

  const passwordsMatch = password === confirmPassword && password.length > 0

  useEffect(() => {
    if (onMatch) {
      onMatch(passwordsMatch)
    }
  }, [passwordsMatch, onMatch])

  const getLetterStatus = (letter: string, index: number) => {
    if (!confirmPassword[index]) return ''
    return confirmPassword[index] === letter
      ? 'apc-bg-match'
      : 'apc-bg-error'
  }

  const bounceAnimation = {
    x: shake ? [-10, 10, -10, 10, 0] : 0,
    transition: { duration: 0.5 },
  }

  const matchAnimation = {
    scale: passwordsMatch ? [1, 1.05, 1] : 1,
    transition: { duration: 0.3 },
  }

  const borderAnimation = {
    borderColor: passwordsMatch ? '#10B981' : '',
    transition: { duration: 0.3 },
  }

  return (
    <div className="apc-container">
      <div className="apc-wrapper">
        <motion.div
          className="apc-dots-box"
          animate={{
            ...bounceAnimation,
            ...matchAnimation,
            ...borderAnimation,
          }}
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="apc-dots-inner">
            <div className="apc-dots-row" style={{ letterSpacing: isVisible ? '0.25em' : '0' }}>
              {password.split('').map((char, index) => (
                <div key={index} className="apc-dot-container">
                  {isVisible ? (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{char}</span>
                  ) : (
                    <span className="apc-dot"></span>
                  )}
                </div>
              ))}
            </div>
            <div className="apc-bg-row">
              {password.split('').map((letter, index) => (
                <motion.div
                  key={index}
                  className={`apc-bg-highlight ${getLetterStatus(letter, index)}`}
                  style={{
                    left: `${index * 16}px`,
                    scaleX: confirmPassword[index] ? 1 : 0,
                    transformOrigin: 'left'
                  }}
                ></motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="apc-input-wrapper"
          animate={matchAnimation}
          style={{ position: 'relative' }}
        >
          <motion.input
            className="apc-input"
            type={isVisible ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            animate={borderAnimation}
            style={{ borderColor: 'var(--border)', paddingRight: '3rem' }}
          />
          <button 
            type="button" 
            onClick={() => setLocalShowPassword(!localShowPassword)}
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              zIndex: 10
            }}
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
