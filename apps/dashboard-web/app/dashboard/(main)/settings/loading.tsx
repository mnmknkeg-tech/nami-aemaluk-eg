import { SkeletonHeader, SkeletonPanel } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
      <SkeletonHeader />
      <SkeletonPanel rows={7} />
    </div>
  );
}
