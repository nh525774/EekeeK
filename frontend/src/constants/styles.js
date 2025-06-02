// src/constants/styles.js
import {theme} from './theme'
import {hp} from '../helpers/common'
import {wp} from '../helpers/common'

export const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#fff",
    height: "100vh",
    flex: 1
  },
  centeredBox: {
    margin: "0 auto",
    maxWidth: "400px",
  },
  button: {
    backgroundColor: theme.colors.primary || "#1D4ED8",
    height: hp ? hp(6.6) : "50px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius?.xl || "12px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  backButton : {
  width: "36px",
  height: "36px",
  padding: 0,
  borderRadius: "12px", // 완전 동그랗게9999
  backgroundColor: "rgba(0,0,0,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
},
  text: {
    fontSize: hp ? hp(2.5) : "16px",
    color: theme.colors?.white || "#fff",
    fontWeight: theme.fonts?.bold || "bold",
  },
 

  loginContainer: {
    display: "flex",
    flex: 1,
    flexDirection: "column", 
    gap: "45px",
    paddingLeft: wp(5),  // wp(5) 대체
    paddingRight: wp(5),
  },

  loginWelcomeText: {
    fontSize: hp(4),     // hp(4) 대체
    fontWeight: theme.fonts?.bold || "bold",
    color: theme.colors?.text || "#000",
  },

  loginForm: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
    
  },

  forgotPassword: {
    textAlign: "right",
    fontWeight: theme.fonts?.semibold || "600",
    color: theme.colors?.text || "#000",
  },

  loginFooter: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: "4px",
    
  },

  loginFooterText: {
    textAlign: "center",
    color: theme.colors?.text || "#000",
    fontSize: hp(1.6), // hp(1.6) 대체
  },
  inputContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: hp(7.2), // hp(7.2) 대체
    border: `0.4px solid ${theme.colors.text}`,
    borderRadius: theme.radius?.xxl || "16px",
    paddingLeft: "18px",   // paddingHorizontal 대응
    paddingRight: "18px",
    gap: "12px",
  },
  
};
