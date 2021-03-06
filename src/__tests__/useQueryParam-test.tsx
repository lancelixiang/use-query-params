import * as React from 'react';
import { renderHook, cleanup } from 'react-hooks-testing-library';
import {
  NumberParam,
  NumericArrayParam,
  EncodedQueryWithNulls,
} from 'serialize-query-params';

import { useQueryParam, QueryParamProvider } from '../index';
import {
  makeMockHistory,
  makeMockLocation,
  calledPushQuery,
  calledReplaceQuery,
} from './helpers';

// helper to setup tests
function setupWrapper(query: EncodedQueryWithNulls) {
  const location = makeMockLocation(query);
  const history = makeMockHistory(location);
  const wrapper = ({ children }: any) => (
    <QueryParamProvider
      history={history}
      location={{ ...location }} // generate a new location each time to reproduce #46
    >
      {children}
    </QueryParamProvider>
  );

  return { wrapper, history, location };
}

describe('useQueryParam', () => {
  afterEach(cleanup);

  it('default param type (string, replaceIn)', () => {
    const { wrapper, history } = setupWrapper({ foo: '123', bar: 'xxx' });
    const { result } = renderHook(() => useQueryParam('foo'), { wrapper });
    const [decodedValue, setter] = result.current;

    expect(decodedValue).toBe('123');
    setter('zzz');
    expect(calledReplaceQuery(history, 0)).toEqual({ foo: 'zzz', bar: 'xxx' });
  });

  it('specific param type and update type', () => {
    const { wrapper, history } = setupWrapper({ foo: '123', bar: 'xxx' });
    const { result } = renderHook(() => useQueryParam('foo', NumberParam), {
      wrapper,
    });
    const [decodedValue, setter] = result.current;

    expect(decodedValue).toBe(123);
    setter(999, 'push');
    expect(calledPushQuery(history, 0)).toEqual({ foo: '999' });
  });

  it("doesn't decode more than necessary", () => {
    const { wrapper, location } = setupWrapper({
      foo: ['1', '2', '3'],
    });
    const { result, rerender } = renderHook(
      () => useQueryParam('foo', NumericArrayParam),
      {
        wrapper,
      }
    );

    const [decodedValue] = result.current;
    expect(decodedValue).toEqual([1, 2, 3]);

    rerender();
    const [decodedValue2, setter2] = result.current;
    expect(decodedValue).toBe(decodedValue2);

    setter2([4, 5, 6], 'replaceIn');
    rerender();
    const [decodedValue3, setter3] = result.current;
    expect(decodedValue).not.toBe(decodedValue3);
    expect(decodedValue3).toEqual([4, 5, 6]);

    setter3([4, 5, 6], 'push');
    rerender();
    const [decodedValue4] = result.current;
    expect(decodedValue3).toBe(decodedValue4);

    // if another parameter changes, this one shouldn't be affected
    location.search = `${location.search}&zzz=123`;
    rerender();
    const [decodedValue5] = result.current;
    expect(decodedValue5).toBe(decodedValue3);
  });

  it('does not generate a new setter with each new query value', () => {
    const { wrapper } = setupWrapper({ foo: '123', bar: 'xxx' });
    const { result, rerender } = renderHook(
      () => useQueryParam('foo', NumberParam),
      {
        wrapper,
      }
    );
    const [, setter] = result.current;

    setter(999, 'push');
    rerender();
    const [, setter2] = result.current;
    expect(setter).toBe(setter2);
  });
});
