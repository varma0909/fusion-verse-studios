# Netlify deployment

The public website and admin console are separate Next.js apps in this repository. Deploy them as two Netlify sites connected to the same GitHub repository:

| Netlify site | Base directory | Build command |
| --- | --- | --- |
| Public website | Repository root | `npm run build` |
| Admin console | `admin-console` | `npm run build` |

Let Netlify detect Next.js for both sites; leave the publish directory unset. Add each site's environment variables in Netlify and redeploy after changing them.

## Supabase

1. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on both Netlify sites.
3. In Supabase Authentication, disable public signups and create the intended admin user.
4. Authorize that user in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict do nothing;
   ```

The admin console is the root page of the separate admin site. Set `NEXT_PUBLIC_WEBSITE_URL` on that site to the public website URL. Only users listed in `public.admin_users` can access admin data.

Keep Supabase service-role and email-provider keys in Supabase Edge Function secrets; never add them to either Netlify site's frontend environment.
