import { Suspense } from 'react';
import { LogUnit } from '../log-unit';

export default function SignInPage() {
  return (
    <Suspense>
      <LogUnit mode="signin" />
    </Suspense>
  );
}
