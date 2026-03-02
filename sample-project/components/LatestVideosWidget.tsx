import { useLatestVideos } from '@/hooks/useLatestVideos'
import { VideoCardWidget } from './VideoCardWidget'

interface LatestVideosWidgetProps {
  count?: number
}

export const LatestVideosWidget = ({ count = 2 }: LatestVideosWidgetProps) => {
  const { latestVideos, isLoading, error } = useLatestVideos(count)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-100 p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-slate-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (latestVideos.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-500">
        Nenhum vídeo disponível no momento.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {latestVideos.map((video) => (
        <div key={video.id} className="rounded-2xl border border-slate-200">
          <VideoCardWidget video={video} />
        </div>
      ))}
    </div>
  )
}
