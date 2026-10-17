// Programa falso rapido de las pruebas de funciones (B8.1 del diseno, H11).
// Se copia como docker.exe, curl.exe... en la caja de la prueba, delante en
// el PATH. Anota sus argumentos en %NG_PRUEBA_LLAMADAS%\<nombre> (una linea
// por llamada, unidos por espacios) y en <nombre>.argv (cada uno entre
// corchetes, uno por linea, y una linea vacia tras cada llamada: para
// comparar la linea de ordenes argumento a argumento), y responde segun
// <nombre>.tabla, junto a el: lineas
// patron|codigo|acciones|salida. Manda la primera cuyo patron este en los
// argumentos unidos por espacios ("*", cualquiera); un patron que empieza
// por [RUTA] solo vale si ese archivo existe (un estado que cambia). La
// salida admite \n y, si empieza por "stderr:", va a la salida de errores.
// Acciones, separadas por comas: entrada (guarda los bytes de la entrada en
// <nombre>.entrada), espera:N (segundos), marca:RUTA (crea el archivo),
// escribe:RUTA=TEXTO (lo escribe en el archivo), escribe-tras:OPCION=TEXTO
// (lo escribe en el archivo del argumento que sigue a OPCION), utf16
// (escribe en UTF-16 salvo con WSL_UTF8=1, como wsl.exe) y oem (escribe en
// la pagina OEM, como taskkill). Las rutas admiten %VARIABLES%. Sin fila que
// coincida, sale con 0.
using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class Falso
{
    [DllImport("kernel32.dll")]
    private static extern int GetOEMCP();

    public static int Main(string[] args)
    {
        string exe = Assembly.GetEntryAssembly().Location;
        string nombre = Path.GetFileNameWithoutExtension(exe);
        string llamadas = Environment.GetEnvironmentVariable("NG_PRUEBA_LLAMADAS");
        Encoding u = new UTF8Encoding(false);
        string linea = string.Join(" ", args);
        if (llamadas != null)
        {
            File.AppendAllText(Path.Combine(llamadas, nombre), linea + "\n", u);
            StringBuilder argv = new StringBuilder();
            foreach (string a in args) { argv.Append("[" + a + "]\n"); }
            File.AppendAllText(Path.Combine(llamadas, nombre + ".argv"), argv.ToString() + "\n", u);
        }
        string tabla = Path.Combine(Path.GetDirectoryName(exe), nombre + ".tabla");
        if (!File.Exists(tabla)) { return 0; }
        foreach (string fila in File.ReadAllLines(tabla, u))
        {
            string[] c = fila.Split(new char[] { '|' }, 4);
            if (c.Length < 4) { continue; }
            string patron = c[0];
            if (patron.StartsWith("[") && patron.IndexOf(']') > 0)
            {
                int fin = patron.IndexOf(']');
                if (!File.Exists(Environment.ExpandEnvironmentVariables(patron.Substring(1, fin - 1)))) { continue; }
                patron = patron.Substring(fin + 1);
            }
            if (patron != "*" && linea.IndexOf(patron, StringComparison.Ordinal) < 0) { continue; }
            Encoding enc = u;
            foreach (string a in c[2].Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
            {
                if (a == "entrada" && llamadas != null)
                {
                    using (FileStream f = new FileStream(Path.Combine(llamadas, nombre + ".entrada"), FileMode.Append))
                    {
                        Console.OpenStandardInput().CopyTo(f);
                    }
                }
                else if (a.StartsWith("espera:")) { Thread.Sleep(int.Parse(a.Substring(7)) * 1000); }
                else if (a.StartsWith("marca:")) { File.WriteAllText(Environment.ExpandEnvironmentVariables(a.Substring(6)), ""); }
                else if (a.StartsWith("escribe:"))
                {
                    string r = a.Substring(8);
                    int i = r.IndexOf('=');
                    File.WriteAllText(Environment.ExpandEnvironmentVariables(r.Substring(0, i)), r.Substring(i + 1));
                }
                else if (a.StartsWith("escribe-tras:"))
                {
                    string r = a.Substring(13);
                    int i = r.IndexOf('=');
                    int j = Array.IndexOf(args, r.Substring(0, i));
                    if (j >= 0 && j + 1 < args.Length) { File.WriteAllText(args[j + 1], r.Substring(i + 1)); }
                }
                else if (a == "utf16" && Environment.GetEnvironmentVariable("WSL_UTF8") != "1") { enc = new UnicodeEncoding(false, false); }
                else if (a == "oem") { enc = Encoding.GetEncoding(GetOEMCP()); }
            }
            string salida = c[3].Replace("\\n", "\n");
            bool error = salida.StartsWith("stderr:");
            if (error) { salida = salida.Substring(7); }
            if (salida.Length > 0)
            {
                byte[] b = enc.GetBytes(salida + "\n");
                Stream o = error ? Console.OpenStandardError() : Console.OpenStandardOutput();
                o.Write(b, 0, b.Length);
                o.Flush();
            }
            return int.Parse(c[1]);
        }
        return 0;
    }
}
