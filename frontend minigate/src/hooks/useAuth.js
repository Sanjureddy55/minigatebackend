import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectFeatures,
  selectRole,
  selectSociety,
  logout,
} from '../store/slices/authSlice.js'

export function useAuth() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectIsLoading)
  const features = useSelector(selectFeatures)
  const role = useSelector(selectRole)
  const society = useSelector(selectSociety)

  function can(module, action = 'can_view') {
    const feat = features?.find((f) => f.module === module)
    if (!feat) return false
    return feat[action] === true
  }

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    features,
    role,
    society,
    can,
    logout: handleLogout,
  }
}
