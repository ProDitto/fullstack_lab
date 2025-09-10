interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
}

export const Avatar = ({ src, alt = 'avatar', size = 10 }: AvatarProps) => {
  const sizeClass = `h-${size} w-${size}`;
  return (
    <img
      src={src || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${alt}`}
      alt={alt}
      className={`rounded-full object-cover ${sizeClass}`}
    />
  );
};
