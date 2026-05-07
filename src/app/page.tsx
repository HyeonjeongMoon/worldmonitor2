import MapComponent from '@/components/MapComponent';
import NewsFeedComponent from '@/components/NewsFeedComponent';

export default function Home() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#000' }}>
      <div style={{ flex: 2, position: 'relative' }}>
        <MapComponent />
      </div>
      <div style={{ flex: 1, borderLeft: '1px solid #333' }}>
        <NewsFeedComponent />
      </div>
    </div>
  );
}
