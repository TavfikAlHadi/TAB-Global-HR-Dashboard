"use client";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Link as LinkIcon, Plus, Share2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOCIAL_PLATFORMS } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";
import { addSocialPost, removeSocialPost, type FormState } from "@/app/actions";
import type { SocialPost } from "@/lib/data";

const platform = (id: string) => SOCIAL_PLATFORMS.find((p) => p.id === id)!;

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied. Paste it into your post or story to share.");
  } catch {
    toast("Couldn't copy. Open the post and share it from there.");
  }
}

/** Likes and shares happen on the platform itself, so they count for TAB's reach. */
export function SocialPanel({ posts, canPost }: { posts: SocialPost[]; canPost: boolean }) {
  const [, startRemove] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      {canPost && <AddPost />}
      {posts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No posts yet.{canPost && " Add the first one above."}</p>}
      <ul className="flex flex-col divide-y divide-border/60">
        {posts.map((p) => {
          const pf = platform(p.platform);
          return (
            <li key={p.id} className="flex flex-col gap-2.5 py-3.5 first:pt-0">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Badge variant="secondary">{pf.name}</Badge>
                <span>{fmtDate(p.posted_at)}</span>
                {canPost && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${pf.name} post`}
                    onClick={() => confirm("Remove this post from the dashboard? It stays on the platform.") && startRemove(() => removeSocialPost(p.id))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <p className="text-sm">{p.caption}</p>
              <div className="flex flex-wrap gap-2">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                  <ExternalLink className="size-4" aria-hidden /> Open to like
                </a>
                {pf.share ? (
                  <a href={pf.share(p.url)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                    <Share2 className="size-4" aria-hidden /> Share on {pf.name}
                  </a>
                ) : (
                  <Button variant="outline" size="lg" className="px-3" onClick={() => copyLink(p.url)}>
                    <LinkIcon aria-hidden /> Copy link to share
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AddPost() {
  const [state, action, pending] = useActionState<FormState, FormData>(addSocialPost, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) { form.current?.reset(); toast("Post added."); }
  }, [state.ok]);
  return (
    <details className="rounded-lg border px-3.5 py-2.5 [&[open]>summary]:mb-3">
      <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary"><Plus className="size-4" aria-hidden /> Add a post</summary>
      <form ref={form} action={action} className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-2.5">
          <label className="flex flex-col gap-1 text-[13px] font-medium text-foreground/80">
            Platform
            <select name="platform" required defaultValue="" className="h-9 rounded-lg border bg-card px-2.5 text-sm text-foreground">
              <option value="" disabled>Choose…</option>
              {SOCIAL_PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-[13px] font-medium text-foreground/80">
            Post link
            <Input name="url" type="url" required placeholder="https://…" className="h-9" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-medium text-foreground/80">
          Caption
          <Input name="caption" required maxLength={280} placeholder="What's the post about?" className="h-9" />
        </label>
        {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" size="lg" className="self-start px-4" disabled={pending}>{pending ? "Adding…" : "Add post"}</Button>
      </form>
    </details>
  );
}
