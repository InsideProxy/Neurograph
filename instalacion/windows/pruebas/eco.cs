// Eco de las pruebas de funciones (B8.1 del diseno, H11): escribe cada
// argumento recibido entre corchetes, uno por linea, en UTF-8, y sale con el
// numero de argumentos. Con --entrada, escribe en hexadecimal los bytes que
// le llegan por la entrada estandar (para ver un BOM).
using System;
using System.IO;
using System.Text;

public static class Eco
{
    public static int Main(string[] args)
    {
        Stream o = Console.OpenStandardOutput();
        Encoding u = new UTF8Encoding(false);
        if (args.Length == 1 && args[0] == "--entrada")
        {
            MemoryStream m = new MemoryStream();
            Console.OpenStandardInput().CopyTo(m);
            byte[] h = u.GetBytes(BitConverter.ToString(m.ToArray()).Replace("-", "") + "\n");
            o.Write(h, 0, h.Length);
            return 0;
        }
        foreach (string a in args)
        {
            byte[] b = u.GetBytes("[" + a + "]\n");
            o.Write(b, 0, b.Length);
        }
        return args.Length;
    }
}
