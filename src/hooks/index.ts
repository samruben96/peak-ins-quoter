/**
 * Custom Hooks Index
 * Export all custom React hooks
 */

// =============================================================================
// Upload Hook
// =============================================================================

export { useUpload, type UploadStatus } from './use-upload'

// =============================================================================
// Array Field Hooks
// =============================================================================

export {
  useArrayField,
  generateArrayFieldId,
  type ArrayFieldItem,
  type UseArrayFieldOptions,
  type UseArrayFieldReturn,
} from './use-array-field'

export {
  usePersistedArrayField,
  type UsePersistedArrayFieldOptions,
  type UsePersistedArrayFieldReturn,
} from './use-persisted-array-field'

export {
  useFormArrays,
  type UseFormArraysOptions,
  type UseFormArraysReturn,
} from './use-form-arrays'
