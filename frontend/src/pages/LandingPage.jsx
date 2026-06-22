import { Link } from 'react-router-dom'
import { Shield, Star, ArrowRight, CheckCircle, Phone, Mail, MapPin, Heart, Users, Video, MessageCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/mindunleash_logo.png" alt="MindHeal" className="h-8 w-auto object-contain" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">About Us</a>
              <a href="#services" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">Services</a>
              <a href="#experts" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">For Experts</a>
              <a href="#blog" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">Blog</a>
              <Link to="/login" className="text-gray-600 hover:text-primary-600 transition-colors text-sm">Login</Link>
            </div>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                You're Not Alone.
                <br />
                <span className="text-primary-600">We're Here to Help.</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
                Connect with licensed therapists, book sessions, and start your journey to better mental health today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base py-3 px-8">
                  Book a Session <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/register" className="btn-secondary flex items-center justify-center gap-2 text-base py-3 px-8">
                  Find a Therapist
                </Link>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex -space-x-2">
                  {['A','B','C','D'].map((l,i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-primary-200 border-2 border-white flex items-center justify-center text-xs font-bold text-primary-700">{l}</div>
                  ))}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">4.9 (2k+ reviews)</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-8">Trusted by Thousands</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: '🔒', text: '100% Confidential', sub: 'Your privacy is our priority' },
                  { icon: '✅', text: 'Verified Experts', sub: 'Licensed and experienced' },
                  { icon: '🛡️', text: 'Secure & Safe', sub: 'End-to-end encrypted' },
                  { icon: '🕐', text: '24/7 Support', sub: "We're here for you" },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-xs text-gray-600 font-medium">{item.text}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 bg-primary-100 rounded-3xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-8xl mb-4">🧠</div>
                    <p className="text-primary-700 font-semibold">Mental Wellness Platform</p>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                  <p className="text-xs text-gray-500">Active Sessions</p>
                  <p className="font-bold text-gray-900 text-lg">1,245</p>
                  <p className="text-xs text-primary-600">↑ 12% this week</p>
                </div>
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                  <p className="text-xs text-gray-500">Expert Therapists</p>
                  <p className="font-bold text-gray-900 text-lg">85+</p>
                  <p className="text-xs text-primary-600">Verified & Licensed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { number: '1,245', label: 'Happy Clients', change: '+11%' },
              { number: '85', label: 'Expert Therapists', change: '+48%' },
              { number: '3,421', label: 'Sessions Completed', change: '+18%' },
              { number: '₹24,780', label: 'Total Revenue', change: '+16%' },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-3xl font-bold">{stat.number}</p>
                <p className="text-primary-200 mt-1 text-sm">{stat.label}</p>
                <p className="text-primary-300 text-xs mt-1">{stat.change} this month</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                About <span className="text-primary-600">Mind Unleash</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                MindHeal is a leading mental wellness platform connecting individuals with licensed therapists across India. We believe mental health care should be accessible, affordable, and stigma-free.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Founded with a mission to make therapy accessible to everyone, we have helped thousands of people overcome anxiety, depression, stress, and relationship challenges.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { number: '10,000+', label: 'Lives Impacted' },
                  { number: '85+', label: 'Expert Therapists' },
                  { number: '4.9★', label: 'Average Rating' },
                  { number: '98%', label: 'Satisfaction Rate' },
                ].map((stat, i) => (
                  <div key={i} className="bg-primary-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-primary-600">{stat.number}</p>
                    <p className="text-gray-600 text-sm mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-primary-50 rounded-3xl p-8">
              <div className="space-y-4">
                {[
                  { emoji: '🎯', title: 'Our Mission', desc: 'Make quality mental health care accessible to every person in India.' },
                  { emoji: '👁️', title: 'Our Vision', desc: 'A world where mental health is treated with the same importance as physical health.' },
                  { emoji: '💚', title: 'Our Values', desc: 'Empathy, confidentiality, professionalism, and continuous care.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-sm">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything You Need for Mental Wellness</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">A complete platform designed to make mental health care accessible and effective.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Video className="w-6 h-6" />, title: 'Video Sessions', desc: 'Face-to-face therapy from comfort of your home', color: 'bg-blue-50 text-blue-600' },
              { icon: <MessageCircle className="w-6 h-6" />, title: 'Chat Therapy', desc: 'Text-based therapy anytime you need support', color: 'bg-green-50 text-green-600' },
              { icon: <Heart className="w-6 h-6" />, title: 'Mood Tracking', desc: 'Daily mood insights and progress reports', color: 'bg-red-50 text-red-600' },
              { icon: <Shield className="w-6 h-6" />, title: '100% Private', desc: 'End-to-end encrypted, fully confidential', color: 'bg-purple-50 text-purple-600' },
            ].map((service, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${service.color}`}>
                  {service.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-500 text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Experts ── */}
      <section id="experts" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">For Mental Health Experts</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Join our network of verified therapists and grow your practice online</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { emoji: '💰', title: 'Earn More', desc: 'Set your own fees and work flexible hours. Earn from anywhere in India.' },
              { emoji: '👥', title: 'Grow Your Practice', desc: 'Access thousands of clients looking for mental health support online.' },
              { emoji: '🛡️', title: 'Secure Platform', desc: 'HIPAA compliant platform with secure video, chat, and payment processing.' },
            ].map((item, i) => (
              <div key={i} className="bg-primary-50 rounded-2xl p-6 border border-primary-100 text-center">
                <div className="text-4xl mb-4">{item.emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-primary-600 rounded-3xl p-8 lg:p-12 text-white text-center">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Join MindHeal?</h3>
            <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
              Join 85+ verified therapists already helping thousands of clients on our platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center gap-2">
                Join as a Therapist <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="border-2 border-white text-white font-semibold py-3 px-8 rounded-xl hover:bg-white hover:text-primary-600 transition-colors">
                Already a Member? Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Blog ── */}
      <section id="blog" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Mental Wellness Blog</h2>
            <p className="text-gray-600 text-lg">Expert insights and tips for better mental health</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { category: 'Anxiety', emoji: '🧠', color: 'bg-blue-50', tagColor: 'bg-blue-100 text-blue-700', title: '10 Proven Ways to Manage Daily Anxiety', desc: 'Discover practical techniques to reduce anxiety and improve your daily wellbeing.', time: '5 min read' },
              { category: 'Depression', emoji: '💙', color: 'bg-purple-50', tagColor: 'bg-purple-100 text-purple-700', title: 'Understanding Depression: Signs and Solutions', desc: 'Learn to recognize the signs of depression and find effective treatment paths.', time: '8 min read' },
              { category: 'Self Care', emoji: '🌱', color: 'bg-green-50', tagColor: 'bg-green-100 text-green-700', title: 'Building a Mental Wellness Routine That Works', desc: 'Simple daily habits that can transform your mental health over time.', time: '6 min read' },
            ].map((post, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className={`h-40 ${post.color} flex items-center justify-center`}>
                  <span className="text-6xl">{post.emoji}</span>
                </div>
                <div className="p-5">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${post.tagColor}`}>{post.category}</span>
                  <h3 className="font-bold text-gray-900 mt-3 mb-2 group-hover:text-primary-600 transition-colors">{post.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{post.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{post.time}</span>
                    <button className="text-primary-600 text-sm font-medium hover:underline">Read more →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      
      {/* ── Contact ── */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get In Touch</h2>
            <p className="text-gray-600">We are here to help you</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: <Phone className="w-6 h-6 text-primary-600" />, title: 'Phone', value: '+91 98765 43210' },
              { icon: <Mail className="w-6 h-6 text-primary-600" />, title: 'Email', value: 'mwp.counseling@gmail.com' },
              { icon: <MapPin className="w-6 h-6 text-primary-600" />, title: 'Location', value: 'Bangalore, India' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-4">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <img src="/mindunleash_logo.png" alt="MindHeal" className="h-8 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="text-sm leading-relaxed">Making mental health care accessible to everyone in India.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-primary-400 transition-colors">Find a Therapist</Link></li>
                <li><Link to="/register" className="hover:text-primary-400 transition-colors">Book a Session</Link></li>
                <li><a href="#pricing" className="hover:text-primary-400 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-primary-400 transition-colors">About Us</a></li>
                <li><a href="#blog" className="hover:text-primary-400 transition-colors">Blog</a></li>
                <li><a href="#contact" className="hover:text-primary-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Therapists</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#experts" className="hover:text-primary-400 transition-colors">Join as Expert</a></li>
                <li><Link to="/register" className="hover:text-primary-400 transition-colors">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-primary-400 transition-colors">Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm">© 2026 Mind Unleash. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0 text-sm">
              <a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}