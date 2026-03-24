import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/remix';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames(
        'flex items-center bg-bolt-elements-background-depth-1 p-5 border-b h-[var(--header-height)] transition-colors duration-200',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        },
      )}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer shrink-0">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          <span className="i-bolt:logo-text?mask w-[46px] inline-block" />
        </a>
      </div>
      <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary font-medium">
        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
      </span>
      <div className="flex items-center gap-4 shrink-0">
        {chat.started && (
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        )}
        <div className="flex items-center gap-3">
          <SignedOut>
            <div className="flex items-center gap-2">
              <a 
                href="/sign-in"
                className="px-4 py-1.5 text-sm font-medium text-bolt-elements-textPrimary hover:text-accent transition-colors no-underline"
              >
                Login
              </a>
              <a 
                href="/sign-up"
                className="px-4 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-all shadow-sm no-underline"
              >
                Sign Up
              </a>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

