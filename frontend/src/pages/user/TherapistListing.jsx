import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Star, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'
import { getImageUrl } from '../../utils/imageUrl'

const SPECIALIZATIONS = ['All', 'Anxiety', 'Depression', 'Relationships', 'Stress', 'Trauma', 'ADHD', 'Grief']

export default function TherapistListing() {
  const { user } = useAuthStore()
  const [therapists, setTherapists] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => { fetchTherapists() }, [])

  const fetchTherapists = async () => {
    try {
      const res = await api.get('/therapists/')
      setTherapists(res.data)
    } catch (error) {
      toast.error('Failed to load therapists')
    } finally {
      setLoading(false)
    }
  }

  const filtered = therapists.filter(t => {
    const matchSearch = search === '' ||
      t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.specializations?.some(s => s.toLowerCase().includes(search.toLowerCase()))
    const matchFilter = activeFilter === 'All' ||
      t.specializations?.some(s => s.toLowerCase().includes(activeFilter.toLowerCase()))
    return matchSearch && matchFilter
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="user" />

      <div className="flex-1 lg:ml-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md pl-12 lg:pl-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search therapists, specializations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Filter className="w-4 h-4" />Filters
              </button>
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                {user?.profile_picture ? (
                  <img src={getImageUrl(user.profile_picture)} alt=""
                    className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <span className="text-primary-700 font-semibold text-sm">{user?.full_name?.charAt(0)}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6">

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {SPECIALIZATIONS.map((spec) => (
              <button key={spec} onClick={() => setActiveFilter(spec)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === spec
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>

          <p className="text-gray-500 text-sm mb-4">{filtered.length} therapist{filtered.length !== 1 ? 's' : ''} found</p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No therapists found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((therapist) => (
                <div key={therapist.id} className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {therapist.profile_picture ? (
                        <img src={getImageUrl(therapist.profile_picture)}
                          alt={therapist.full_name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <span className="text-primary-700 font-bold text-2xl">
                          {therapist.full_name?.charAt(0) || 'T'}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{therapist.full_name}</h3>
                          <p className="text-primary-600 text-sm font-medium">
                            {therapist.specializations?.[0]}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₹{therapist.session_fee}</p>
                          <p className="text-gray-400 text-xs">/ session</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{therapist.rating}</span>
                        </div>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 text-sm">({therapist.total_reviews} reviews)</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 text-sm">{therapist.experience_years}+ Yrs Exp</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {therapist.specializations?.slice(0, 4).map((spec, i) => (
                          <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full capitalize">
                            {spec}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                          <Globe className="w-4 h-4" />
                          {therapist.languages?.join(', ')}
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/therapists/${therapist.id}`}
                            className="border border-primary-600 text-primary-600 text-sm px-4 py-1.5 rounded-lg hover:bg-primary-50 transition-colors font-medium"
                          >
                            View Profile
                          </Link>
                          <Link to={`/book/${therapist.id}`}
                            className="bg-primary-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                          >
                            Book Session
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}