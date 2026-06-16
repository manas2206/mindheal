import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, Star, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Sidebar from '../../components/common/Sidebar'

const RESOURCES = [
  {
    category: 'Anxiety',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    items: [
      { title: 'Managing Anxiety', desc: 'A practical guide to deal with anxiety', time: '5 min read', rating: 4.8, slug: 'managing-anxiety' },
      { title: 'Breathing Techniques', desc: 'Simple breathing exercises for calm', time: '3 min read', rating: 4.9, slug: 'breathing-techniques' },
      { title: 'Anxiety & Diet', desc: 'How food affects your anxiety levels', time: '7 min read', rating: 4.5, slug: 'managing-anxiety' },
    ]
  },
  {
    category: 'Depression',
    color: 'bg-purple-50 text-purple-600 border-purple-100',
    items: [
      { title: 'Meditation for Beginners', desc: 'Step by step guide for daily meditation', time: '8 min read', rating: 4.7, slug: 'meditation-beginners' },
      { title: 'Improve Self Esteem', desc: 'Build confidence and self worth', time: '6 min read', rating: 4.6, slug: 'meditation-beginners' },
      { title: 'Daily Habits', desc: 'Small habits that fight depression', time: '5 min read', rating: 4.8, slug: 'meditation-beginners' },
    ]
  },
  {
    category: 'Sleep',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    items: [
      { title: 'Sleep Better', desc: 'Tips for relaxation and better sleep', time: '7 min read', rating: 4.9, slug: 'sleep-better' },
      { title: 'Sleep Hygiene', desc: 'Building a healthy sleep routine', time: '4 min read', rating: 4.7, slug: 'sleep-better' },
      { title: 'Insomnia Guide', desc: 'Understanding and treating insomnia', time: '10 min read', rating: 4.5, slug: 'sleep-better' },
    ]
  },
  {
    category: 'Stress',
    color: 'bg-green-50 text-green-600 border-green-100',
    items: [
      { title: 'Stress Management', desc: 'Practical techniques to reduce stress', time: '6 min read', rating: 4.8, slug: 'stress-management' },
      { title: 'Work Life Balance', desc: 'Finding balance in a busy life', time: '5 min read', rating: 4.6, slug: 'stress-management' },
      { title: 'Mindfulness Daily', desc: 'Practicing mindfulness every day', time: '4 min read', rating: 4.9, slug: 'stress-management' },
    ]
  },
]

export default function SelfHelp() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const allItems = RESOURCES.flatMap(r => r.items.map(i => ({ ...i, category: r.category, color: r.color })))
  const filtered = allItems.filter(item =>
    (activeCategory === 'All' || item.category === activeCategory) &&
    (search === '' || item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role={user?.role || 'user'} />

      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 sticky top-0 z-30">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-xl font-bold text-gray-900">Self Help Resources</h1>
            <p className="text-gray-500 text-sm hidden sm:block">Recommended resources for your wellbeing</p>
          </div>
        </header>

        <div className="p-4 lg:p-6">

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['All', ...RESOURCES.map(r => r.category)].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group">
                <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border mb-3 ${item.color}`}>
                  {item.category}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm mb-4">{item.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{item.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{item.rating}
                    </span>
                  </div>
                  <Link
                    to={`/self-help/${item.slug}`}
                    className="text-primary-600 text-xs font-medium flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Read <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}