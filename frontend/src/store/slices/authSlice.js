import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

const setTokens = ({ accessToken, refreshToken }) => {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      setTokens(response.data)
      return response.data.user
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', { name, email, password })
      setTokens(response.data)
      return response.data.user
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed')
    }
  }
)

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return response.data.message
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to send OTP')
    }
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp })
      return response.data.resetToken
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'OTP verification failed')
    }
  }
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, resetToken, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/reset-password', { email, resetToken, newPassword })
      return response.data.message
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Password reset failed')
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/change-password', { currentPassword, newPassword })
      return response.data.message
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Password change failed')
    }
  }
)

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/profile')
      return response.data.user
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Local logout should still complete if the server is unreachable.
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.patch('/users/profile', data)
      return response.data.user
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Update failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
      state.initialized = true
    },
    clearError(state) {
      state.error = null
    },
    setInitialized(state) {
      state.initialized = true
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.initialized = true
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // register
      .addCase(register.pending, (state) => { state.loading = true; state.error = null })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.initialized = true
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // fetchProfile
      .addCase(fetchProfile.pending, (state) => { state.loading = true })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.initialized = true
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.initialized = true
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      })
      // logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
      // updateProfile — server always returns the full updated user via toPublic()
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (action.payload && typeof action.payload === 'object') {
          // Replace user entirely with the server-returned object so no stale fields remain
          state.user = { ...action.payload }
        }
      })
  },
})

export const { setUser, clearError, setInitialized } = authSlice.actions
export default authSlice.reducer
