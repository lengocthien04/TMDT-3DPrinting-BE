export const APP_CONSTANTS = {
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
  },
  BCRYPT: {
    SALT_ROUNDS: 10,
  },
  RATE_LIMIT: {
    TTL: 60000, // 1 minute
    LIMIT: 100, // 100 requests per minute
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },
  DATE_FORMAT: {
    ISO: 'YYYY-MM-DD',
    DISPLAY: 'DD/MM/YYYY',
  },
  CURRENCY: {
    CODE: 'VND',
    SYMBOL: '₫',
  },
};

export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS:
      'Invalid email or password. Please check your credentials and try again.',
    USER_NOT_FOUND: 'User not found. Please register first.',
    EMAIL_ALREADY_EXISTS:
      'Email already exists. Please use a different email or login.',
    USERNAME_ALREADY_EXISTS:
      'Username already taken. Please choose a different username.',
    INVALID_TOKEN: 'Invalid or expired token. Please login again.',
    UNAUTHORIZED:
      'You are not authorized to perform this action. Please login first.',
    TOKEN_EXPIRED: 'Your session has expired. Please login again.',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token. Please login again.',
  },
  USER: {
    NOT_FOUND: 'User not found.',
    INVALID_PASSWORD: 'Current password is incorrect. Please try again.',
    PASSWORD_MISMATCH: 'Passwords do not match.',
    UPDATE_FAILED: 'Failed to update user profile. Please try again.',
  },
  PRODUCT: {
    NOT_FOUND: 'Product not found.',
    INVALID_ID: 'Invalid product identifier provided.',
    CREATE_FAILED: 'Failed to create product. Please try again.',
    UPDATE_FAILED: 'Failed to update product. Please try again.',
    DELETE_FAILED: 'Failed to delete product. Please try again.',
    PERMISSION_DENIED: 'Only administrators can perform this action.',
    CREATED_SUCCESS: 'Product created successfully.',
    UPDATED_SUCCESS: 'Product updated successfully.',
    DELETED_SUCCESS: 'Product deleted successfully.',
  },
  TAG: {
    NOT_FOUND: 'Tag not found.',
    CREATE_FAILED: 'Failed to create tag. Please try again.',
    UPDATE_FAILED: 'Failed to update tag. Please try again.',
    DELETE_FAILED: 'Failed to delete tag. Please try again.',
    DUPLICATE_NAME: 'Tag name already exists.',
    PERMISSION_DENIED:
      'You do not have permission to perform this action on tags.',
  },
  MEDIA: {
    NOT_FOUND: 'Media asset not found.',
    CREATE_FAILED: 'Failed to create media asset. Please try again.',
    UPDATE_FAILED: 'Failed to update media asset. Please try again.',
    DELETE_FAILED: 'Failed to delete media asset. Please try again.',
    PERMISSION_DENIED: 'You do not have permission to manage media assets.',
    INVALID_PAYLOAD: 'Invalid media payload. Please provide url and type.',
    CREATED_SUCCESS: 'Media asset created successfully.',
    UPDATED_SUCCESS: 'Media asset updated successfully.',
    DELETED_SUCCESS: 'Media asset deleted successfully.',
  },
  CART_ITEM: {
    NOT_FOUND: 'Cart item not found.',
    ALREADY_EXISTS: 'This item is already in your cart.',
    CREATE_FAILED: 'Failed to add item to cart. Please try again.',
    UPDATE_FAILED: 'Failed to update cart item. Please try again.',
    DELETE_FAILED: 'Failed to remove item from cart. Please try again.',
    PERMISSION_DENIED: 'You do not have permission to modify this cart.',
    INVALID_QUANTITY: 'Quantity must be a positive integer.',
    CREATED_SUCCESS: 'Item added to cart successfully.',
    UPDATED_SUCCESS: 'Cart item updated successfully.',
    DELETED_SUCCESS: 'Item removed from cart successfully.',
  },
  CART: {
    NOT_FOUND: 'Cart not found.',
    CREATE_FAILED: 'Failed to create cart. Please try again.',
  },
  VARIANT: {
    NOT_FOUND: 'Product variant not found.',
    CREATE_FAILED: 'Failed to create variant. Please try again.',
    UPDATE_FAILED: 'Failed to update variant. Please try again.',
    DELETE_FAILED: 'Failed to delete variant. Please try again.',
    PERMISSION_DENIED: 'You do not have permission to manage variants.',
    CREATED_SUCCESS: 'Variant created successfully.',
    UPDATED_SUCCESS: 'Variant updated successfully.',
    DELETED_SUCCESS: 'Variant deleted successfully.',
  },
  EXPENSE: {
    NOT_FOUND: 'Expense not found or you do not have permission to access it.',
    CREATE_FAILED:
      'Failed to create expense. Please check your input and try again.',
    UPDATE_FAILED: 'Failed to update expense. Please try again.',
    DELETE_FAILED: 'Failed to delete expense. Please try again.',
    INVALID_AMOUNT: 'Amount must be a positive number.',
    INVALID_DATE: 'Invalid date format. Please use YYYY-MM-DD format.',
  },
  BUDGET: {
    NOT_FOUND: 'Budget not found or you do not have permission to access it.',
    CREATE_FAILED:
      'Failed to create budget. Please check your input and try again.',
    UPDATE_FAILED: 'Failed to update budget. Please try again.',
    DELETE_FAILED: 'Failed to delete budget. Please try again.',
    INVALID_AMOUNT: 'Budget amount must be a positive number.',
    INVALID_DATE_RANGE: 'End date must be after start date.',
    OVERLAPPING_BUDGET: 'You already have an active budget for this period.',
  },
  CATEGORY: {
    NOT_FOUND: 'Category not found.',
    CREATE_FAILED: 'Failed to create category. Please try again.',
    UPDATE_FAILED: 'Failed to update category. Please try again.',
    DELETE_FAILED:
      'Cannot delete category. It is being used by existing expenses.',
    DUPLICATE_NAME: 'Category name already exists.',
    DEFAULT_CATEGORY_DELETE: 'Cannot delete default categories.',
  },
  REVIEW: {
    NOT_FOUND: 'Review not found.',
    CREATE_FAILED:
      'Failed to create review. Please check your input and try again.',
    UPDATE_FAILED: 'Failed to update review. Please try again.',
    DELETE_FAILED: 'Failed to delete review. Please try again.',
    PERMISSION_DENIED:
      'You do not have permission to perform this action on the review.',
    ALREADY_EXISTS: 'You have already submitted a review for this product.',
    INVALID_RATING: 'Rating must be an integer between 1 and 5.',
    CREATED_SUCCESS: 'Review created successfully.',
    UPDATED_SUCCESS: 'Review updated successfully.',
    DELETED_SUCCESS: 'Review deleted successfully.',
  },
  QNA: {
    NOT_FOUND: 'Question not found.',
    CREATE_FAILED:
      'Failed to create question. Please check your input and try again.',
    UPDATE_FAILED: 'Failed to update answer. Please try again.',
    DELETE_FAILED: 'Failed to delete question. Please try again.',
    PERMISSION_DENIED:
      'You do not have permission to perform this action on this question.',
    ALREADY_ANSWERED: 'This question has already been answered.',
    CREATED_SUCCESS: 'Question submitted successfully.',
    UPDATED_SUCCESS: 'Answer updated successfully.',
    DELETED_SUCCESS: 'Question deleted successfully.',
  },
  MATERIAL: {
    NOT_FOUND: 'Material not found.',
    CREATE_FAILED: 'Failed to create material. Please try again.',
    UPDATE_FAILED: 'Failed to update material. Please try again.',
    DELETE_FAILED: 'Failed to delete material. Please try again.',
    PERMISSION_DENIED: 'You do not have permission to manage materials.',
    DUPLICATE_NAME: 'Material name already exists.',
    CREATED_SUCCESS: 'Material created successfully.',
    UPDATED_SUCCESS: 'Material updated successfully.',
    DELETED_SUCCESS: 'Material deleted successfully.',
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_FORMAT: 'Invalid format. Please check your input.',
    MIN_LENGTH: 'Must be at least {min} characters long.',
    MAX_LENGTH: 'Must not exceed {max} characters.',
  },
};
