import { If, IsArray, IsObject, StringKeys, UnionToIntersection, Values } from '../util/types';
import { BaseData, XataRecord } from './record';

// Public: Utility type to get a union with the selectable columns of an object
export type SelectableColumn<O, RecursivePath extends any[] = []> =
  // Alias for any property
  | '*'
  // Alias for id (not in schema)
  | 'id'
  // Properties of the current level
  | DataProps<O>
  // Nested properties of the lower levels
  | NestedColumns<O, RecursivePath>;

// Public: Utility type to get the XataRecord built from a list of selected columns (includes XataRecord)
export type SelectedRecordPick<O extends XataRecord, Key extends SelectableColumn<O>[]> = InternalSelectedPick<
  O,
  Key,
  true
> extends XataRecord
  ? InternalSelectedPick<O, Key, true>
  : XataRecord;

// Public: Utility type to get the value of a column at a given path
export type ValueAtColumn<O, P extends SelectableColumn<O>> = P extends '*'
  ? Values<O> // Alias for any property
  : P extends 'id'
  ? string // Alias for id (not in schema)
  : P extends keyof O
  ? O[P] // Properties of the current level
  : P extends `${infer K}.${infer V}`
  ? K extends keyof O
    ? Values<V extends SelectableColumn<O[K]> ? { V: ValueAtColumn<O[K], V> } : never>
    : never
  : never;

// Private: To avoid circular dependencies, we limit the recursion depth
type MAX_RECURSION = 5;

// Private: Utility type to get a union with the columns below the current level
// Exclude type in union: never
type NestedColumns<O, RecursivePath extends any[]> = RecursivePath['length'] extends MAX_RECURSION
  ? never
  : If<
      IsObject<O>,
      Values<{
        [K in DataProps<O>]: If<
          IsArray<NonNullable<O[K]>>,
          `${K}`, // If the property is an array, we stop recursion. We don't support object arrays yet
          If<
            IsObject<NonNullable<O[K]>>,
            SelectableColumn<NonNullable<O[K]>, [...RecursivePath, O[K]]> extends string
              ? `${K}` | `${K}.${SelectableColumn<O[K], [...RecursivePath, O[K]]>}`
              : never,
            K
          >
        >;
      }>,
      never
    >;

// Private: Utility type to get object properties without XataRecord ones
type DataProps<O> = Exclude<StringKeys<O>, StringKeys<XataRecord>>;

// Private: Utility type to get the data built from a list of selected columns
// If IncludeRecord is true, we include XataRecord properties in the result
type InternalSelectedPick<O extends XataRecord, Key extends SelectableColumn<O>[], IncludeRecord> =
  // For each column, we get its nested value and join it as an intersection
  UnionToIntersection<
    Values<{
      [K in Key[number]]: NestedValueAtColumn<O, K, IncludeRecord> & ExtraProperties<O, IncludeRecord>;
    }>
  >;

// Private: Utility type to build the extra properties of a record
// If IncludeRecord is true, we include XataRecord properties in the result
// If IncludeRecord is false, we include an optional id property
type ExtraProperties<O, IncludeRecord> = O extends XataRecord
  ? IncludeRecord extends true
    ? XataRecord
    : { id?: string }
  : never;

// Private: Utility type to get the value of a column at a given path (nested object value)
// For "foo.bar.baz" we return { foo: { bar: { baz: type } } }
type NestedValueAtColumn<O, Key extends SelectableColumn<O>, IncludeRecord> =
  // If a column is a nested property, infer N and M
  Key extends `${infer N}.${infer M}`
    ? N extends DataProps<O>
      ? {
          [K in N]: M extends SelectableColumn<O[K]>
            ? // @ts-ignore: M does not infer the correct type, probably a TS bug...
              NestedValueAtColumn<NonNullable<O[K]>, M, IncludeRecord> & ExtraProperties<XataRecord, IncludeRecord>
            : unknown; //`Property ${M} is not selectable on type ${K}`;
        }
      : unknown //`Property ${M} does not exist on type ${N}`
    : Key extends DataProps<O>
    ? { [K in Key]: O[K] }
    : Key extends '*'
    ? {
        [K in IncludeRecord extends true
          ? keyof NonNullable<O>
          : Exclude<keyof NonNullable<O>, keyof XataRecord>]: NonNullable<NonNullable<O>[K]> extends XataRecord
          ? ExtraProperties<XataRecord, IncludeRecord>
          : NonNullable<O>[K];
      }
    : unknown; //`Property ${Key} is invalid`;
