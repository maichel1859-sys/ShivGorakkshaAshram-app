import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Heart,
  Users,
  Shield,
  Smartphone,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  // Server-side redirect for authenticated users
  if (session?.user) {
    switch (session.user.role) {
      case "ADMIN":
        redirect("/admin");
      case "COORDINATOR":
        redirect("/coordinator");
      case "GURUJI":
        redirect("/guruji");
      default:
        redirect("/user");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-4 sm:py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              <span className="hidden sm:inline">Ashram Management System</span>
              <span className="sm:hidden">AMS</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <Link href="/signin">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
              <Button variant="outline" size="sm" className="sm:hidden px-3">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="hidden sm:inline-flex">
                Get Started
              </Button>
              <Button size="sm" className="sm:hidden px-3">
                Join
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight">
            Spiritual Wellness Made Simple
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0">
            Complete management system for ashram appointments, consultations,
            and remedy delivery. Connect with spiritual guidance seamlessly
            through our modern platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-3">
                Book Your First Appointment
              </Button>
            </Link>
            <Link href="/signin" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-3">
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Everything You Need for Spiritual Care
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2 sm:px-0">
            Our comprehensive platform brings together appointment booking,
            queue management, consultations, and remedy delivery in one seamless
            experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow h-full">
            <CardHeader className="pb-3 sm:pb-6">
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mb-3 sm:mb-4" />
              <CardTitle className="text-lg sm:text-xl">Easy Appointment Booking</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Schedule your consultations with preferred Gurujis at your
                convenience.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-2">
                <li>• Real-time availability</li>
                <li>• Recurring appointments</li>
                <li>• Instant confirmations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow h-full">
            <CardHeader className="pb-3 sm:pb-6">
              <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mb-3 sm:mb-4" />
              <CardTitle className="text-lg sm:text-xl">QR Code Check-in</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Quick and contactless check-in process with QR code scanning.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-2">
                <li>• Contactless check-in</li>
                <li>• Instant queue updates</li>
                <li>• Mobile-friendly</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow h-full">
            <CardHeader className="pb-3 sm:pb-6">
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mb-3 sm:mb-4" />
              <CardTitle className="text-lg sm:text-xl">Real-time Queue Management</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Stay informed about your position and estimated wait times.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-2">
                <li>• Live queue updates</li>
                <li>• Wait time estimates</li>
                <li>• SMS & email alerts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow h-full">
            <CardHeader className="pb-3 sm:pb-6">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mb-3 sm:mb-4" />
              <CardTitle className="text-lg sm:text-xl">Consultation Interface</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Dedicated tools for Gurujis to manage consultations efficiently.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-2">
                <li>• Devotee history access</li>
                <li>• Digital note taking</li>
                <li>• Remedy prescription</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow h-full">
            <CardHeader className="pb-3 sm:pb-6">
              <Heart className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mb-3 sm:mb-4" />
              <CardTitle className="text-lg sm:text-xl">Digital Remedy Delivery</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Receive personalized remedies and instructions digitally.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-2">
                <li>• PDF remedy documents</li>
                <li>• Multi-language support</li>
                <li>• Email & SMS delivery</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow h-full">
            <CardHeader className="pb-3 sm:pb-6">
              <Shield className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mb-3 sm:mb-4" />
              <CardTitle className="text-lg sm:text-xl">Role-based Access</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Secure system with appropriate access levels for all users.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1 sm:space-y-2">
                <li>• User, Coordinator, Guruji, Admin roles</li>
                <li>• Secure authentication</li>
                <li>• Data privacy protection</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="bg-primary text-primary-foreground rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Ready to Begin Your Spiritual Journey?
          </h3>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 px-2 sm:px-0">
            Join thousands who have found peace and guidance through our
            platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-6 sm:px-8 py-3">
                Create Account
              </Button>
            </Link>
            <Link href="/signin" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 border-white text-white hover:bg-white hover:text-primary"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 sm:py-8 border-t">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <p className="text-sm sm:text-base">
            &copy; 2024 Ashram Management System. Built with ❤️ for spiritual
            wellness.
          </p>
        </div>
      </footer>
    </div>
  );
}
