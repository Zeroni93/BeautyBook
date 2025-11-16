interface UserAvatarProps {
  avatarUrl?: string | null
  displayName?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ 
  avatarUrl, 
  displayName = 'User', 
  size = 'md',
  className = ''
}: UserAvatarProps) {
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20 md:w-24 md:h-24',
    lg: 'w-32 h-32'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg md:text-xl',
    lg: 'text-2xl'
  }

  return (
    <div className={`relative ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Profile avatar"
          className={`${sizeClasses[size]} rounded-full object-cover border-4 border-blue-100 dark:border-blue-900`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-blue-100 dark:border-blue-900`}>
          <span className={`text-white ${textSizeClasses[size]} font-semibold`}>
            {getAvatarInitials(displayName)}
          </span>
        </div>
      )}
    </div>
  )
}