using Microsoft.VisualStudio.TestTools.UnitTesting;
using _22;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace _22.Tests
{
    [TestClass()]
    public class LogicTests
    {
        [TestMethod()]
        public void CheckTest()
        {
            string word1 = "ааббв";
            string word2 = "в";

            string result = Logic.Check(word1, word2);

            Assert.AreEqual("нет нет да ", result);
        }
        [TestMethod()]
        public void CheckTest2()
        {
            string word3 = "процессор";
            string word4 = "информация";

            string result1 = Logic.Check(word3, word4);

            Assert.AreEqual("нет да да да нет нет ", result1);
        }

        [TestMethod()]
        public void CheckTest3()
        {
            string word5 = "Ало";
            string word6 = "Ало";

            string result2 = Logic.Check(word5, word6);

            Assert.AreEqual("да да да ", result2);
        }
    }
}