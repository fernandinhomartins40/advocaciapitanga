import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, FileText, Brain, MessageSquare, Shield, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-900">Advocacia Pitanga</span>
          </div>
          <Link href="/login">
            <Button>Acessar Sistema</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-primary-900 mb-6">
          Gestão Jurídica Inteligente
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Sistema completo de gestão para escritórios de advocacia com inteligência artificial integrada
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login?type=advogado">
            <Button size="lg" className="text-lg px-8">
              Acesso Advogado
            </Button>
          </Link>
          <Link href="/login?type=cliente">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Acesso Cliente
            </Button>
          </Link>
        </div>
      </section>

      {/* Serviços */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-primary-900 mb-12">
          Nossos Serviços
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Gestão de Processos</CardTitle>
              <CardDescription>
                Controle completo de todos os processos jurídicos em um só lugar
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Brain className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>IA Jurídica</CardTitle>
              <CardDescription>
                Geração automática de peças jurídicas com inteligência artificial
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Comunicação Direta</CardTitle>
              <CardDescription>
                Canal direto entre advogado e cliente para acompanhamento de processos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Segurança Total</CardTitle>
              <CardDescription>
                Seus dados protegidos com as melhores práticas de segurança
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Clock className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Acesso 24/7</CardTitle>
              <CardDescription>
                Acompanhe seus processos a qualquer hora, de qualquer lugar
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-12 w-12 text-primary-600 mb-4" />
              <CardTitle>Documentação Digital</CardTitle>
              <CardDescription>
                Armazene e compartilhe documentos de forma segura e organizada
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Sobre */}
      <section className="bg-primary-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Sobre Advocacia Pitanga</h2>
            <p className="text-lg opacity-90">
              Somos um escritório de advocacia moderno, combinando expertise jurídica
              com tecnologia de ponta. Nossa missão é tornar a gestão jurídica mais
              eficiente, transparente e acessível para advogados e clientes.
            </p>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary-900 mb-8">
            Entre em Contato
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold">Endereço:</p>
                <p className="text-gray-600">Rua Exemplo, 123 - São Paulo/SP</p>
              </div>
              <div>
                <p className="font-semibold">Telefone:</p>
                <p className="text-gray-600">(11) 98765-4321</p>
              </div>
              <div>
                <p className="font-semibold">Email:</p>
                <p className="text-gray-600">contato@advocaciapitanga.com.br</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Advocacia Pitanga. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
