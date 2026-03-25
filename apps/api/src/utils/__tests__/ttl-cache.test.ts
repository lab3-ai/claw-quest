import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TtlCache } from '../ttl-cache';

describe('TtlCache', () => {
  let cache: TtlCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new TtlCache<string>();
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns value before TTL expires', () => {
    cache.set('key', 'value', 30_000);
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined after TTL expires', () => {
    cache.set('key', 'value', 30_000);
    vi.advanceTimersByTime(30_001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('deletes a specific key', () => {
    cache.set('key', 'value', 30_000);
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('deleteByPrefix removes all matching keys', () => {
    cache.set('quests:list:live::50:0', 'a', 30_000);
    cache.set('quests:list:::50:0', 'b', 30_000);
    cache.set('quests:detail:abc', 'c', 60_000);
    cache.deleteByPrefix('quests:list:');
    expect(cache.get('quests:list:live::50:0')).toBeUndefined();
    expect(cache.get('quests:list:::50:0')).toBeUndefined();
    expect(cache.get('quests:detail:abc')).toBe('c');
  });

  it('cleanup removes expired entries', () => {
    cache.set('key', 'value', 100);
    vi.advanceTimersByTime(101);
    // trigger cleanup interval (5 min default)
    vi.advanceTimersByTime(5 * 60_000);
    // key should be gone from internal store
    expect(cache.get('key')).toBeUndefined();
  });
});
