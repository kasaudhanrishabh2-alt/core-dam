import { redirect } from 'next/navigation';

// Root redirect — middleware handles auth, this just ensures / → /assets
export default function RootPage() {
  redirect('/assets');
}
