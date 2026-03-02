import { useNavigate } from 'react-router-dom'
import type { Video } from '@/pages/SupportMaterial/supportMaterial.types'

interface VideoCardWidgetProps {
  video: Video
}

export const VideoCardWidget = ({ video }: VideoCardWidgetProps) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/materiais?videoId=${video.id}`)
  }

  return (
    <div
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-slate-200">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-primary/80" />
          )}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-black line-clamp-2">{video.title}</p>
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center bg-cinza-50 px-2 py-1 text-xs font-semibold text-cinza-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
