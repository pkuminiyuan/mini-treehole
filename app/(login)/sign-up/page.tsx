import { Suspense } from 'react';
import { LogUnit } from '../log-unit';

export default function SignUpPage() {
  return (
    <Suspense>
      <LogUnit mode="signup" />
    </Suspense>
  );
}
