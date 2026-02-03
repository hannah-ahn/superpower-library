// DEVELOPMENT MODE: Auth disabled
// import { createServerSupabaseClient } from '@/lib/supabase/server'
// import { redirect } from 'next/navigation'

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // DEVELOPMENT: Auth check disabled
  // const supabase = await createServerSupabaseClient()
  // const { data: { user } } = await supabase.auth.getUser()

  // if (!user) {
  //   redirect('/login')
  // }

  return <>{children}</>
}
