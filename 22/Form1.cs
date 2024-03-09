using System.Text.RegularExpressions;

namespace _22
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
            Word1.Text = Properties.Settings.Default.word1.ToString();
            Word2.Text = Properties.Settings.Default.word2.ToString();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            try
            {
                string word1 = (Word1.Text);
                string word2 = (Word2.Text);

                bool ValidWord1 = Regex.IsMatch(word1, @"^[a-zA-Z�-��-�]+$");
                bool ValidWord2 = Regex.IsMatch(word2, @"^[a-zA-Z�-��-�]+$");


                if (!ValidWord1 || !ValidWord2)
                {
                    // ���� ���� �� ���� �� ���� �� ������������� �������, ����������� ����������
                    throw new FormatException();
                }

                //  �������� ��������� �������� � ���������
                Properties.Settings.Default.word1 = word1;
                Properties.Settings.Default.word2 = word2;
                Properties.Settings.Default.Save();

                string result = Logic.Check(word1, word2);
                MessageBox.Show(result);
            }
            catch (FormatException)
            {
                MessageBox.Show("������");
            }
        }

        private void label1_Click(object sender, EventArgs e)
        {

        }

        private void button3_Click(object sender, EventArgs e)
        {
            Word1.Text = "";
            Word2.Text = "";
        }

        private void Word1_KeyPress(object sender, KeyPressEventArgs e)
        {
            if (e.KeyChar == (char)Keys.Enter)
            {
                e.Handled = true;
                Word2.Focus();
            }
        }

        private void Word2_KeyPress(object sender, KeyPressEventArgs e)
        {
            if (e.KeyChar == (char)Keys.Enter)
            {
                e.Handled = true;
                button1.Focus();
            }
        }

        private void button2_Click(object sender, EventArgs e)
        {
            MessageBox.Show("���� ��� �����. ��� ������ ����� ������� ����� ����������, ������ �� ��� �� ������ �����. ������������� ����� ������� ����� �� �������������. ��������, ���� �������� ����� ��������� � ����������, �� ��� ���� ������� �� ��� ������� ������ ����: ��� �� �� �� ��� ���.");
        }
    }
    public class Logic
    {   /*
        /brief ������� ������� ������������� ����� � ���������� ������ �� ��� �� ������ �����.
        /param A - ������ �����, B - ������ �����.
        /return result - ��������� ���������� ������.
        */
        public static string Check(string A, string B)
        {
            string result = "";

            string Replay = "";

            for (int i = 0; i < A.Length; i++)
            {
                char letter = A[i];
                bool search = false;

                for (int c = 0; c < Replay.Length; c++)
                {
                    if (letter == Replay[c])
                    {
                        search = true;
                        break;
                    }
                }
                if (!search)
                {
                    Replay += letter;
                }
            }

            for (int i = 0; i < Replay.Length; i++)
            {
                char letter = Replay[i];
                bool search = false;

                for (int c = 0; c < B.Length; c++)
                {
                    if (letter == B[c])
                    {
                        search = true;
                        break;
                    }
                }

                if (search)
                {
                    result += "�� ";
                }
                else
                {
                    result += "��� ";
                }
            }

            return result;
        }
    }
}
