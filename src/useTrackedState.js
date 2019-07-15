import {
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { defaultContext } from './Provider';

import { useIsomorphicLayoutEffect, useForceUpdate } from './utils';

import { createDeepProxy, isDeepChanged } from './deepProxy';

import { createUseDispatch } from './useDispatch';

export const createUseTrackedState = customContext => (opts = {}) => {
  const forceUpdate = useForceUpdate();
  const { state, subscribe } = useContext(customContext);
  const affected = new WeakMap();
  const lastTracked = useRef(null);
  useIsomorphicLayoutEffect(() => {
    lastTracked.current = {
      state,
      affected,
      cache: new WeakMap(),
      /* eslint-disable no-nested-ternary, indent, @typescript-eslint/indent */
      assumeChangedIfNotAffected:
        opts.unstable_forceUpdateForStateChange ? true
      : opts.unstable_ignoreIntermediateObjectUsage ? false
      : /* default */ null,
      /* eslint-enable no-nested-ternary, indent, @typescript-eslint/indent */
    };
  });
  useEffect(() => {
    const callback = (nextState) => {
      const changed = isDeepChanged(
        lastTracked.current.state,
        nextState,
        lastTracked.current.affected,
        lastTracked.current.cache,
        lastTracked.current.assumeChangedIfNotAffected,
      );
      if (changed) {
        lastTracked.current.state = nextState;
        forceUpdate();
      }
    };
    const unsubscribe = subscribe(callback);
    // force update in case the state is already changed
    forceUpdate();
    return unsubscribe;
  }, [subscribe, forceUpdate]);
  const proxyCache = useRef(new WeakMap()); // per-hook proxyCache
  return createDeepProxy(state, affected, proxyCache.current);
};

export const createUseTracked = (customContext) => {
  const useTrackedState = createUseTrackedState(customContext);
  const useDispatch = createUseDispatch(customContext);
  return (opts) => {
    const state = useTrackedState(opts);
    const dispatch = useDispatch();
    return useMemo(() => [state, dispatch], [state, dispatch]);
  };
};

export const useTrackedState = createUseTrackedState(defaultContext);
export const useTracked = createUseTracked(defaultContext);