# Plan: Absolute Trigger Time (`triggerAt`) for All Mechanics

## Summary
Add `triggerAt` param to all mechanics. Script says "resolve at T=11000 from script start" instead of calculating duration/delay manually.

## Changes

### 1. Track script start time in ScriptRunnerImpl
**File:** `src/server/encounters/script-runner.ts`

- Add `private scriptStartTime: number` field
- Set `this.scriptStartTime = Date.now()` in constructor
- Add helper: `private getElapsedTime(): number { return Date.now() - this.scriptStartTime }`

### 2. Add `triggerAt` to all MechanicParams types
**File:** `src/server/encounters/types.ts`

Add `triggerAt?: number` to every mechanic param type:
```typescript
| { type: 'chariot'; ...; triggerAt?: number; duration?: number }
| { type: 'spread'; ...; triggerAt?: number; duration?: number }
| { type: 'tether'; ...; triggerAt?: number; duration?: number }
| { type: 'tower'; ...; triggerAt?: number; duration?: number }
| { type: 'lineAoe'; ...; triggerAt?: number; duration?: number }
| { type: 'conalAoe'; ...; triggerAt?: number; duration?: number }
| { type: 'radialKnockback'; ...; triggerAt?: number; delay?: number; ... }
| { type: 'linearKnockback'; ...; triggerAt?: number; delay?: number; ... }
```

### 3. Update spawn() to compute timing from triggerAt
**File:** `src/server/encounters/script-runner.ts`

Update run() to create new ScriptRunnerImpl for sub-scripts (scoped timeline):
```typescript
async run(script: Script): Promise<void> {
  // Create new runner so sub-script has its own T=0
  const subRunner = new ScriptRunnerImpl(this.game);
  const ctx = createContext();
  await script(subRunner, ctx);
}
```

Add helper method:
```typescript
private computeTiming(triggerAt: number | undefined, timing: number | undefined, defaultTiming: number, timingName: string): number {
  if (triggerAt !== undefined && timing !== undefined) {
    throw new Error(`Cannot specify both triggerAt and ${timingName}`);
  }
  if (triggerAt !== undefined) {
    const computed = triggerAt - this.getElapsedTime();
    if (computed < 0) {
      throw new Error(`triggerAt ${triggerAt} already passed (elapsed: ${this.getElapsedTime()})`);
    }
    return computed;
  }
  return timing ?? defaultTiming;
}
```

Update each case to use helper:
```typescript
case 'chariot': {
  const duration = this.computeTiming(mechanic.triggerAt, mechanic.duration, DEFAULTS.chariot.duration, 'duration');
  // ... rest unchanged
}

case 'linearKnockback': {
  const delay = this.computeTiming(mechanic.triggerAt, mechanic.delay, DEFAULTS.linearKnockback.delay, 'delay');
  // ... rest unchanged
}
```

### 4. Update existing scripts to use triggerAt where beneficial
**File:** `src/server/encounters/scripts/combos/quad-knock.ts`

Before:
```typescript
const FIRST_KNOCK_DELAY = 9500;     // from T=0
const SECOND_KNOCK_DELAY = 9000;    // from T=2000 (triggers at T=11000)
```

After:
```typescript
const FIRST_KNOCK_TRIGGER = 9500;   // T=9500
const SECOND_KNOCK_TRIGGER = 11000; // T=11000
```

Check other scripts for candidates (any mechanic spawned after wait() where absolute time is clearer).

## Files Modified
1. `src/server/encounters/types.ts` - add triggerAt to all mechanic params
2. `src/server/encounters/script-runner.ts` - track start time, add computeTiming helper, update all cases
3. `src/server/encounters/scripts/**/*.ts` - update scripts to use triggerAt where beneficial

## Error Behavior
- Both `triggerAt` and `duration`/`delay` specified → throw Error
- `triggerAt` already passed (negative result) → throw Error

## Unresolved Questions
None.
